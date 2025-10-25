const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  },
});

async function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { authorId } = event.queryStringParameters || {};
      
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Prefix: 'communityNotes/',
      });

      const listResponse = await s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ notes: [] }),
        };
      }

      const notes = await Promise.all(
        listResponse.Contents.map(async (item) => {
          const getCommand = new GetObjectCommand({
            Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
            Key: item.Key,
          });
          const response = await s3Client.send(getCommand);
          return JSON.parse(await streamToString(response.Body));
        })
      );

      const filteredNotes = authorId 
        ? notes.filter(note => note.authorId === authorId)
        : notes;

      filteredNotes.sort((a, b) => b.timestamp - a.timestamp);

      return {
        statusCode: 200,
        body: JSON.stringify({ notes: filteredNotes }),
      };
    }

    if (event.httpMethod === 'POST') {
      const { action, noteId, noteData } = JSON.parse(event.body);

      if (action === 'create') {
        const newNoteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const note = {
          id: newNoteId,
          ...noteData,
          timestamp: Date.now(),
          likes: 0,
          blocked: false
        };

        const putCommand = new PutObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `communityNotes/${newNoteId}.json`,
          Body: JSON.stringify(note),
          ContentType: 'application/json',
        });

        await s3Client.send(putCommand);

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, noteId: newNoteId, note }),
        };
      }

      if (action === 'delete' && noteId) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `communityNotes/${noteId}.json`,
        });

        await s3Client.send(deleteCommand);

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
        };
      }

      if (action === 'update' && noteId && noteData) {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `communityNotes/${noteId}.json`,
        });

        const response = await s3Client.send(getCommand);
        const note = JSON.parse(await streamToString(response.Body));

        Object.keys(noteData).forEach(key => {
          note[key] = noteData[key];
        });

        const putCommand = new PutObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `communityNotes/${noteId}.json`,
          Body: JSON.stringify(note),
          ContentType: 'application/json',
        });

        await s3Client.send(putCommand);

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, note }),
        };
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error managing community notes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage community notes', message: error.message }),
    };
  }
};
