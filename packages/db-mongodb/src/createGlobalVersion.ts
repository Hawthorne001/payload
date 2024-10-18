import type { CreateGlobalVersion } from 'payload/database'
import type { PayloadRequest } from 'payload/types'

import type { MongooseAdapter } from '.'

import sanitizeInternalFields from './utilities/sanitizeInternalFields'
import { withSession } from './withSession'

export const createGlobalVersion: CreateGlobalVersion = async function createGlobalVersion(
  this: MongooseAdapter,
  { autosave, createdAt, globalSlug, parent, req = {} as PayloadRequest, updatedAt, versionData },
) {
  const VersionModel = this.versions[globalSlug]
  const options = await withSession(this, req)

  const [doc] = await VersionModel.create(
    [
      {
        autosave,
        createdAt,
        latest: true,
        parent,
        updatedAt,
        version: versionData,
      },
    ],
    options,
    req,
  )

  await VersionModel.updateMany(
    {
      $and: [
        {
          _id: {
            $ne: doc._id,
          },
        },
        {
          parent: {
            $eq: parent,
          },
        },
        {
          latest: {
            $eq: true,
          },
        },
      ],
    },
    { $unset: { latest: 1 } },
    options,
  )

  const result = this.jsonParse ? JSON.parse(JSON.stringify(doc)) : doc.toObject()

  const verificationToken = doc._verificationToken

  if (verificationToken) {
    result._verificationToken = verificationToken
  }
  return sanitizeInternalFields(result)
}
