var io = require('socket.io')()

io.on('connection', function (socket) {
  console.log("new connection");
  socket.on('log', function(data) { console.log(data) });

  socket.on('release', function(data) {
    console.log('release', data);
    io.emit('release', data);
  });
  socket.on('distance', function (data) {
    console.log('distance', data);
    io.emit('translateY', data);
  });
});

io.listen(5000);