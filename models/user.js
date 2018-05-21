const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs')

const userSchema = new Schema({
    email: { type: String, unique: true, lowercase: true },
    password: String,
    passwordResetKey: String,
    passwordResetDate: Date
}, {
    usePushEach: true
});

// On Save Hook, encrypt password

userSchema.pre('save', function (next, req) {

    console.log(req);

    // [1] New User
    // [2] Update User

    if (this.isNew || req.resetPassword) { // Created Hashed Passwrod
        const user = this;

        bcrypt.genSalt(10, function (err, salt) {
            if (err) return next(err);

            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });

    } else {
        if (req) {
            if (req.route.path === '/requestResetPassword') {
                next();
            }
        }
    }

});

userSchema.methods.comparePassword = function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) {
            return callback(err);
        }
        callback(null, isMatch);
    });
}

const ModelClass = mongoose.model('user', userSchema);

module.exports = ModelClass;
