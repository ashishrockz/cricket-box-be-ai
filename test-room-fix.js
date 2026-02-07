const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Room } = require('./src/models');

dotenv.config();

async function testRoomCreation() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Create a room without providing a code
        const roomData = {
            name: 'Test Room ' + Date.now(),
            description: 'Integration test for auto-generated code',
            creator: new mongoose.Types.ObjectId(), // Mock user ID
            settings: {
                overs: 6,
                playersPerTeam: 7
            },
            participants: [{
                user: new mongoose.Types.ObjectId(),
                joinedAt: new Date(),
                role: null,
                isReady: true
            }]
        };

        const room = await Room.create(roomData);
        console.log('Room created successfully!');
        console.log('Room ID:', room._id);
        console.log('Room Code:', room.code);

        if (room.code && room.code.length === 6) {
            console.log('Verification Success: Room code was auto-generated correctly.');
        } else {
            console.error('Verification Failed: Room code was not generated or has incorrect length.');
        }

        // Cleanup
        await Room.findByIdAndDelete(room._id);
        console.log('Test room deleted.');

        await mongoose.connection.close();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testRoomCreation();
