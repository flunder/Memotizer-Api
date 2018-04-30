const Authentication = require('./controllers/authentication');
const passportService = require('./services/passport');
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', {session: false});
const requireSignIn = passport.authenticate('local', {session: false});

var User = require("./models/user");
var Memo = require("./models/memo");
var Category = require("./models/category");
var Note = require("./models/note");

module.exports = function (app) {

    app.post('/signup', Authentication.signup);
    app.post('/signin', requireSignIn, Authentication.signin);

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

    /* TESTING ROUTES */

    app.get('/', requireAuth, (req, res) => {
        res.send({message: 'S3CR3T M3SS4G3'});
    });


    app.get('/xxx', (req, res) => {
        // res.send('yo');
        res.status(200).json({
            message: "You're authorized to see this secret message."
        });
    })

    app.get('/myBooks', requireAuth, (req, res) => {
        var user = req.user;
        Book.find({ user: user._id}, (err, users) => {
            res.json(users);
        });

    })

    app.get('/users', (req, res) => {
        User.find((err, users) => {
            if (err) return next(err);
            res.json(users);
        });

    })

    app.get('/books', requireAuth, (req, res) => {
        var token = getToken(req.headers);

        if (token) {
            Book.find((err, books) => {
                if (err) return next(err);
                res.json(books);
            });
        } else {
            return res.status(403).send({success: false, msg: 'Unauthorized.'});
        }
    });

    app.post('/book', requireAuth, (req, res) => {
        var token = getToken(req.headers);
        console.log("**", token);
        var user = req.user;

        console.log("**", req.body);

        if (token) {

            const aUser = User.findById(user._id);

            myUser.update((err) => {
                if (err) return handleError(err);

                var newBook = new Book({
                    isbn: req.body.isbn,
                    title: req.body.title,
                    author: req.body.author,
                    publisher: req.body.publisher,
                    user: user._id
                });

                newBook.save((err) => {
                    if (err) {
                        return res.json({success: false, msg: `Save book failed. ${err}`});
                    }
                    res.json({success: true, msg: 'Successful created new book.'});
                });

            })


        } else {
            return res.status(403).send({success: false, msg: 'Unauthorized.'});
        }
    });
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
