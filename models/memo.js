var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MemoSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    notes: [{
        type: Schema.Types.ObjectId,
        ref: 'note',
    }],
    category: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    orderOfNotes: {
        type: Array
    }
}, {
    usePushEach: true
});

module.exports = mongoose.model('memo', MemoSchema);
