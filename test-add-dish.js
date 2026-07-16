const http = require('http');

const postData = JSON.stringify({
  restaurantName: "Test Rest",
  branchName: "Main",
  email: "test@example.com",
  password: "password123"
});

const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/restaurant/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Signup:', body);
    
    // Login
    const req2 = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/restaurant/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log('Login:', body2);
        const token = JSON.parse(body2).token;
        
        // Add Dish
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const payload = `--${boundary}\r\nContent-Disposition: form-data; name="food_name"\r\n\r\nTest Dish\r\n--${boundary}\r\nContent-Disposition: form-data; name="price"\r\n\r\n100\r\n--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nStarter\r\n--${boundary}\r\nContent-Disposition: form-data; name="availability"\r\n\r\ntrue\r\n--${boundary}--\r\n`;
        
        const req3 = http.request({
          hostname: 'localhost',
          port: 8000,
          path: '/api/dishes',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res3) => {
          let body3 = '';
          res3.on('data', chunk => body3 += chunk);
          res3.on('end', () => {
            console.log('Add Dish:', res3.statusCode, body3);
          });
        });
        req3.write(payload);
        req3.end();
      });
    });
    req2.write(postData);
    req2.end();
  });
});
req.write(postData);
req.end();
