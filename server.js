const express = require('express')
const app = express()

const server = require('http').createServer(app)
const io = require('socket.io')(server);


io.on('connection', client => {
    console.log(`connection recieved`);
    client.on('new_message', (chat) => {
        console.log(`new message recieved: ${chat}`)
        io.emit('broadcast', chat)
        console.log(`new message broadcasted: ${chat}`)

    })
})
app.get('/' , function(req,res)  { 
    res.send("Chat server is running started vg..")
})


// here instead of the app , use server.listen isiliye send hellow work ni kar raaha tha
server.listen(3000,() =>{  
    console.log("Server running at 3000...")
})