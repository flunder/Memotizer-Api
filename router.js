const Authentication = require('./controllers/authentication');
const passportService = require('./services/passport');
const passport = require('passport');
const nodemailer = require('nodemailer');
const got = require('got');
const rand = require("random-key");

const requireAuth = passport.authenticate('jwt', {session: false});
const requireSignIn = passport.authenticate('local', {session: false});

var User = require("./models/user");
var Memo = require("./models/memo");
var Category = require("./models/category");
var Note = require("./models/note");

module.exports = function (app) {

    app.get('/ga', (req, res) => {
        trackEvent('Example category', 'Reset Password', 'Example label', { 'metric1': 1 })
            .then(() => {
                res.status(200).send('Event tracked.').end();
            })
            // This sample treats an event tracking error as a fatal error. Depending
            // on your application's needs, failing to track an event may not be
            // considered an error.
            .catch(err => {
                console.log(`Error sending tracking data ${err}`);
            });
    })

    // Don't forget to send a 200 in any case
    // Needs process.env.MEMOTIZER_HOST = host
    // and process.env.LA_APP_MSG_PASS = email password

    app.post('/requestResetPassword', (req, res) => {

        const email = req.body.email;
        const passwordResetKey = rand.generate();

        User.findOne({email: email}, function (err, existingUser) {
            if (err) {
                return next(err);
            }

            if (!existingUser) {
                console.log('user doesnt exist');
            } else {
                existingUser.passwordResetKey = passwordResetKey;
                existingUser.passwordResetDate = new Date();
                existingUser.save(req, function() {});
            }
        })

        nodemailer.createTestAccount((err, account) => {

            const resetPasswordUrl = process.env.MEMOTIZER_HOST + '/resetPassword/' + email + '/' + passwordResetKey;

            const htmlEmail = `
                <h3>Contact Details</h3>
                <ul>
                    <li>Name: Lars</li>
                    <li>Message: Hi!</li>
                    <li>Param: ${req.body.message}</li>
                </ul>
                <a href="${resetPasswordUrl}">Click here to reset your password</a>
            `

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'la.app.messenger@gmail.com',
                    pass: process.env.LA_APP_MSG_PASS
                }
            });

            let mailOptions = {
                from: 'la.app.messenger@gmail.com',
                from: '"Memotizer" <la.app.messenger@gmail.com>',
                to: email,
                replyTo: 'la.app.messenger@gmail.com',
                subject: 'Memotizer Password Reset',
                text: 'Hello world?',
                html: htmlEmail
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                // console.log('Message sent: %s', info.messageId);
                // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            });

            // GA TRACKING OF RESET EVENTS
            // Currently not working

            trackEvent('Example category', 'Reset Password', 'Example label', { 'metric1': 1 })
                .then(() => {
                    res.status(200).send('Event tracked.').end();
                })
                // // This sample treats an event tracking error as a fatal error. Depending
                // // on your application's needs, failing to track an event may not be
                // // considered an error.
                // .catch(err => {
                //     console.log(`Error sending tracking data ${err}`);
                // });

            res.sendStatus(200);
        })

    })

    app.post('/signup', Authentication.signup);
    app.post('/signin', requireSignIn, Authentication.signin);
    app.post('/resetPassword', Authentication.resetPassword);

    // Get Memos [GET]

    app.get('/memos', requireAuth, (req, res) => {
        var token = getToken(req.headers);
        var user = req.user;
        console.log(token);
        Memo.find({ user: user._id, category: req.query.category })
        .populate('notes')
        .exec((err, memos) => {
            if (err) console.log(err);
            res.json(memos);
        });
    })

    // Add Memo [POST]

    app.post('/memos', requireAuth, (req, res) => {
        var token = getToken(req.headers);
        const user = User.findById(req.user._id);

        console.log(req.body);

        var memo = new Memo({
            title: req.body.title,
            url: req.body.url,
            user: req.user._id,
            orderOfNotes: []
        });

        if (req.body.category) {
            memo.category = req.body.category;
        }

        memo.save((err) => {
            if (err) return res.json({
                success: false, msg: `Save memo failed. ${err}`
            });

            res.json(memo);
        });

    })

    // Delete a Memo [POST]

    app.delete('/memos/:id', requireAuth, (req, res) => {

        Memo.findByIdAndRemove({ _id: req.params.id }, (err, item) => {
            if (err) return res.json({
                success: false, msg: `Deleteing memo failed. ${err}`
            });
            res.json(item);
        })

    })

    // List Categories [GET]

    app.get('/categories', requireAuth, (req, res) => {
        var user = req.user;

        Category.find({ user: user._id }, (err, categories) => {
            if (err) return res.json({ error: err });
            res.json(categories);
        });
    })

    // Create Category [POST]

    app.post('/categories', requireAuth, (req, res) => {
        var user = req.user;

        console.log(req.body);

        const newCategory = new Category({
            name: req.body.name,
            color: req.body.color,
            user: req.user._id
        })

        newCategory.save((err) => {
            if (err) return res.json({
                success: false, msg: `Saving the category failed. ${err}`
            });

            res.json(newCategory)
        })
    })

    // Delete Category [POST]

    app.delete('/category/:id', requireAuth, (req, res) => {
        var user = req.user;

        Category.findByIdAndRemove({ _id: req.params.id }, (err, note) => {
            if (err) return res.json({
                success: false, msg: `Deleting category failed. ${err}`
            });
            res.send(200);
        })

    })

    // Create Note [POST]

    app.post('/memos/:id/notes', requireAuth, (req, res) => {

        var user = req.user;
        var memoId = req.params.id;
        var token = getToken(req.headers);

        const myMemo = Memo.findById(memoId, (err, m) => {

            const newNote = new Note(Object.assign({}, req.body, { memo: memoId }));

            newNote.save((err) => {
                if (err) return res.json({
                    success: false, msg: `Save memo failed. ${err}`
                });

                m.notes.push(newNote);
                m.orderOfNotes.push(newNote._id)
                m.save();

                res.json(newNote);
            });

        });

    })

    // Update a Note [POST]

    app.post('/note/:id', requireAuth, (req, res) => {

        Note.findById(req.params.id, (err, note) => {
            note.desc = req.body.desc;
            note.save();

            res.json(note)
        })

    })

    // Delete a Note [DELETE]

    app.delete('/note/:id', requireAuth, (req, res) => {

        Note.findById(req.params.id, (err, note) => {

            var idToRemove = note._id;

            // Take care to remove the note_id from orderOfNotes on the memo
            // and change the associated notes

            Memo.findById(note.memo, (err, memo) => {

                var orderOfNotes = memo.orderOfNotes;
                var index = orderOfNotes.indexOf(idToRemove);
                if (index > -1) orderOfNotes.splice(index, 1);

                var notes = memo.notes;
                var index = notes.indexOf(idToRemove);
                if (index > -1) notes.splice(index, 1);

                // Apply and save
                memo.orderOfNotes = orderOfNotes;
                memo.notes = notes;
                memo.save();
            })
        })

        Note.findByIdAndRemove({ _id: req.params.id }, (err, note) => {
            if (err) return res.json({
                success: false, msg: `Deleting note failed. ${err}`
            });
            res.send(200);
        })

    })

    // Get Notes [GET]

    app.get('/memos/:id/notes', requireAuth, (req, res) => {

        Note.find({ memo: req.params.id }, (err, notes) => {
            res.json(notes)
        })

    })

    app.post('/memos/:id/updateNoteOrder', requireAuth, (req, res) => {

        var user = req.user;
        var memoID = req.params.id;
        var token = getToken(req.headers);

        Memo.findById(memoID, (err, m) => {

            m.orderOfNotes = req.body;
            m.save();

            res.json(m)

        });

    })

}

getToken = (headers) => {

    return headers.authorization;

    // if (headers && headers.authorization) {
    //     var parted = headers.authorization.split(' ');
    //     if (parted.length === 2) {
    //         return parted[1];
    //     } else {
    //         return null;
    //     }
    // } else {
    //     return null;
    // }
};

trackEvent = (category, action, label, value, cb) => {
    const data = {
        // API Version.
        v: '1',
        // Tracking ID / Property ID.
        tid: 'UA-119521617-1',
        // Anonymous Client Identifier. Ideally, this should be a UUID that
        // is associated with particular user, device, or browser instance.
        cid: '555',
        // Event hit type.
        t: 'event',
        // Event category.
        ec: category,
        // Event action.
        ea: action,
        // Event label.
        el: label,
        // Event value.
        ev: value
    };

    return got.post('http://www.google-analytics.com/collect', {
        form: data
    });
}
