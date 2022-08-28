const { AuthenticationError } = require("apollo-server-express");
// import user model
const { User } = require("../models");
const { signToken } = require("../utils/auth");

const resolvers = {
  Query: {
    // By adding context to our query, we can retrieve the logged in user without specifically searching for them
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id }).populate(
          "books"
        );

        return userData;
      }
      throw new AuthenticationError("You need to be logged in!");
    },
  },

  Mutation: {
    createUser: async (parent, { username, email, password }) => {
      try {
        const user = await User.create({ username, email, password });
        const token = signToken(user);
        return { token, user };
      } catch (err) {
        console.log(err);
      }
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError("No user found with this email address");
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect password!");
      }

      const token = signToken(user);
      return { token, user };
    },

    // Add a third argument to the resolver to access data in our `context`
    saveBook: async (parent, args, context) => {
      // If context has a `user` property, that means the user executing this mutation has a valid JWT and is logged in
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          {
            $addToSet: { savedBooks: args.input },
          },
          {
            new: true,
            runValidators: true,
          }
        );
        return updatedUser;
      }
      // If user attempts to execute this mutation and isn't logged in, throw an error
      throw new AuthenticationError("You need to be logged in!");
    },

    // Make it so a logged in user can only remove a skill from their own profile
    deleteBook: async (parent, args, context) => {
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { savedBooks: { bookId: args.bookId } } },
          { new: true }
        );
        return updatedUser;
      }
      throw new AuthenticationError("You need to be logged in!");
    },
  },
};

module.exports = resolvers;
