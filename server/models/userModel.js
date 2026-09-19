import { collections, database } from '../config/database.js'

async function userCollection() {
  return (await database()).collection(collections.users)
}

export async function findUserById(id) {
  return (await userCollection()).findOne({ id }, { projection: { _id: 0 } })
}

export async function findUserByEmail(email) {
  return (await userCollection()).findOne({ email }, { projection: { _id: 0 } })
}

export async function createUser(user) {
  await (await userCollection()).insertOne(user)
  return user
}
