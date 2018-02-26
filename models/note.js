var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NoteSchema = new Schema({
    desc: {
        type: String,
        required: true
    },
    memo: {
        type: Schema.Types.ObjectId,
        ref: 'memo'
    }
});

module.exports = mongoose.model('note', NoteSchema);
