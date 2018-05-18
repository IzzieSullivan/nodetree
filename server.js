var mysql = require('mysql')
// Let’s make node/socketio listen on port 3000
var io = require('socket.io').listen(3000)
// Define our db creds
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'passport'
})
 
// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err)
})
 
// Define/initialize our global vars
var children = []
var isInitNotes = false
var socketCount = 0

var factories = []
var isInitFactories = false
 
io.sockets.on('connection', function(socket){
    // Socket has connected, increase socket count
    socketCount++
    // Let all sockets know how many are connected
    io.sockets.emit('users connected', socketCount)
 
    socket.on('disconnect', function() {
        // Decrease the socket count on a disconnect, emit
        socketCount--
        io.sockets.emit('users connected', socketCount)
    })
 
    socket.on('new note', function(data){
        // New note added, push to all sockets and insert into db
	console.log(data);
        children.push(data)
        io.sockets.emit('new note', data)
        // Use node's db injection format to filter incoming data
        db.query('INSERT INTO children (number) VALUES (?)', data.number)
    })

    //------- new child in factory
    socket.on('new child', function(data){
        // New note added, push to all sockets and insert into db
        console.log(data);
        children.push(data)
        io.sockets.emit('new child', data)
        // Use node's db injection format to filter incoming data
	db.query('INSERT INTO children (number, factory_id) VALUES (' + data.number + "," + data.factoryid + ")" )
    }) 

    socket.on('rename factory', function(data){
        // New note added, push to all sockets and insert into db
        console.log(data);
        //children.push(data)
        io.sockets.emit('rename factory', data)
        // Use node's db injection format to filter incoming data
        db.query('UPDATE factories SET factory_name="' + data.newname + '" WHERE id="' + data.fid +'"')
    })

    socket.on('new factory', function(data){
        // New note added, push to all sockets and insert into db
        console.log(data);
        factories.push(data)
        //io.sockets.emit('new factory', data)
        // Use node's db injection format to filter incoming data
	db.query('INSERT INTO factories (factory_name, min, max) VALUES ("' + data.name + '",' + data.min +"," + data.max + ")" );
	db.query( 'SELECT id FROM factories WHERE factory_name="' + data.name + '"', ( err, rows ) => {
    		// do something with the results here
		console.log(rows[rows.length-1]);
		var dbid = rows[rows.length-1].id;
		console.log(dbid);
        	data.id = dbid;
        	io.sockets.emit('new factory', data)
	} );

	//data.id = dbid;
	//io.sockets.emit('new factory', data)
    })

    socket.on('delete factory', function(data){
        // New note added, push to all sockets and insert into db
        console.log(data);
        io.sockets.emit('delete factory', data)
       
        // Use node's db injection format to filter incoming data
        db.query('DELETE FROM factories WHERE id="' + data.factoryid +'"')
	db.query('DELETE FROM children WHERE factory_id="' + data.factoryid +'"')
        
})

    // intial factories
    if (! isInitFactories) {
        // Initial app start, run db query
        db.query('SELECT * FROM factories')
            .on('result', function(data){
                // Push results onto the notes array
                factories.push(data)
            })
            .on('end', function(){
                // Only emit notes after query has been completed
                socket.emit('initial factories', factories)
            })

        isInitFactories = true
    } else {
        // Initial notes already exist, send out
        socket.emit('initial factories', factories)
    }

    // Check to see if initial query/notes are set
    if (! isInitNotes) {
        // Initial app start, run db query
        db.query('SELECT * FROM children')
            .on('result', function(data){
                // Push results onto the notes array
                children.push(data)
            })
            .on('end', function(){
                // Only emit notes after query has been completed
                socket.emit('initial notes', children)
            })
 
        isInitNotes = true
    } else {
        // Initial notes already exist, send out
        socket.emit('initial notes', children)
    }


})
