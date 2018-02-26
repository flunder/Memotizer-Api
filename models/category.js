var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CategorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId, ref: 'user'
    }
});

module.exports = mongoose.model('category', CategorySchema);
