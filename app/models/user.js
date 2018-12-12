var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

// These are the default user fields
var UserSchema = new mongoose.Schema({
	firstName: String,
	lastName: String,
	email: {
		type: String,
		lowercase: true,
		unique: true,
		required: true
	},
	password: {
		type: String,
		required: true,
		// select: false
	},
	role: {
		type: String,
		enum: ['user'],
		default: 'user'
	},
	loggedIn: {
		type: Boolean,
		required: true,
		default: false
	},
	tokenWhitelist: {
		type: [String],
		required: false
	},
	verify: {
		code: {
			type: String,
			required: false
		},
		attempts: {
			type: Number,
			required: false,
			default: 3
		}
	},
	reset_password_token: {
		type: String,
		required: false
	},
	reset_password_expires: {
		type: Date,
		required: false
	},
	isDeactivated: {
		type: Boolean,
		required: false
	}
}, {
	timestamps: true // DB fields createdAt/updatedAt
});


// Save the user's hashed password
// pre means do this before saving the user to db
UserSchema.pre('save', function(next){
  var user = this;
  if (this.isModified('password') || this.isNew){
    bcrypt.genSalt(10, function(err, salt){
      if (err){
        return next(err);
      }
      bcrypt.hash(user.password, salt, function(err, hash){
        if(err){
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  } else{
    return next();
  }
});

// Create method to compare password
UserSchema.methods.comparePassword = function(pw, cb) {
  bcrypt.compare(pw, this.password, function(err, isMatch){
    if(err){
      return cb(err);
    }
    cb(null, isMatch);
  });
};


module.exports = mongoose.model('User', UserSchema);
