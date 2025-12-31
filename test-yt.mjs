import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  try {
    console.log('Testing youtube-transcript package...');
    const data = await YoutubeTranscript.fetchTranscript('Ks-_Mh1QhMc');
    console.log('Received data:', data);
    console.log('Data length:', data?.length);
    console.log('First item:', JSON.stringify(data[0], null, 2));
    
    // Test text extraction
    const text = data.map(item => item.text).join(' ');
    console.log('Combined text length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
