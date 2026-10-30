const t0 = Date.now();
async function test() {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:1.5b',
      format: 'json',
      stream: false,
      options: {
        num_predict: 500,
      },
      messages: [{
        role: 'user',
        content: 'Tạo 2 câu hỏi toán lớp 1 dạng JSON {"questions": [{"prompt": "...", "options": ["1","2","3","4"], "correctAnswer": "1", "explanation": "..."}]}'
      }]
    })
  });
  const data = await res.json();
  console.log('Took seconds:', (Date.now() - t0) / 1000);
  console.log(data.message?.content);
}
test();
