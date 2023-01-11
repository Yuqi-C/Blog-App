//type definitions - schemas (operation and data strcutures)

const typeDefs = `
type Query {
    user(username: String!): User

    login(username:String!, password: String!): String

    blog(bid: ID!): Blog

    blogs
        (
        is_private: Boolean
        sort: String
        username: String
        ): [Blog]!
        
    translate(text: String): String
}

type Mutation {
    userCreate(
        username: String!
        password: String!
        nickname: String!
        bio: String!
    ): String
    blogCreate(
        blogInput: BlogInput!
    ):Blog
    blogEdit(
        username: String
        text: String
    ):String
    blogUpdate(
        bid: ID!
        text: String!
    ):Blog
    blogDelete(
        bid: ID!
    ):Boolean
    delete:Boolean
}

type Subscription{
    blogCreate: BlogPayLoad
    blogEdit(username: String): EidtPayLoad
    blogDelete: BlogPayLoad
}

type Blog{
    bid: ID!
    username: String!
    created_at: String
    text: String
    is_private: Boolean
    ip: String
}

input BlogInput{
    username: String!
    is_private: Boolean!
    text: String!
    ip: String
}

type BlogPayLoad{
    bid: ID
    username: String
    text: String
}

type User {
    username: String!
    password: String!
    uid: ID!
    nickname: String!
    bio: String!
}

type EidtPayLoad{
    username: String
    text: String
}
`;

module.exports = typeDefs;