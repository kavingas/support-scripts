const mysql = require('mysql2/promise');

async function insertRecords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: '',
    password: '',
    database: 'm24develop'
  });

  const batchSize = 1000;
  const totalRecords = 1000000;

  // Fetch valid queue_id values from the queue table
  const [queues] = await connection.query('SELECT id FROM queue');
  const validQueueIds = queues.map(queue => queue.id);

  if (validQueueIds.length === 0) {
    console.error('No valid queue_id found in the queue table.');
    await connection.end();
    return;
  }

  console.log('Inserting records...');

  for (let i = 0; i < totalRecords / batchSize; i++) {
    const messageValues = [];
    for (let j = 0; j < batchSize; j++) {
      const index = i * batchSize + j + 1;
      messageValues.push([`Dummy topic ${index}`, `Dummy body content for message ${index}`]);
    }

    const messageQuery = 'INSERT INTO queue_message (topic_name, body) VALUES ?';
    const [result] = await connection.query(messageQuery, [messageValues]);

    const insertedIds = Array.from({ length: batchSize }, (_, k) => result.insertId + k);
    const statusValues = insertedIds.map(id => [
      validQueueIds[Math.floor(Math.random() * validQueueIds.length)], // Random valid queue_id
      id,
      new Date(),
      7,
      Math.floor(Math.random() * 10)
    ]);

    const statusQuery = 'INSERT INTO queue_message_status (queue_id, message_id, updated_at, status, number_of_trials) VALUES ?';
    await connection.query(statusQuery, [statusValues]);

    console.log(`Inserted batch ${i + 1} of ${totalRecords / batchSize}`);
  }

  console.log('Insertion complete.');
  await connection.end();
}

insertRecords().catch(err => {
  console.error('Error inserting records:', err);
});