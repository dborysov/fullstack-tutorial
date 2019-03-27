const { paginateResults } = require('./utils')

module.exports = {
  Mission: {
    missionPatch: (mission, { size = 'LARGE' }) =>
      size === 'SMALL' ? mission.missionPatchSmall : mission.missionPatchLarge,
  },
  Launch: {
    isBooked: async (launch, _, { dataSources }) =>
      dataSources.userAPI.isBookedOnLaunch({ launchId: launch.id }),
  },
  User: {
    trips: async (_, __, { dataSources }) => {
      // get ids of launches by user
      const launchIds = await dataSources.userAPI.getLaunchIdsByUser()

      if (!launchIds.length) return []

      // look up those launches by their ids
      return (
        dataSources.launchAPI.getLaunchesByIds({
          launchIds,
        }) || []
      )
    },
  },
  Query: {
    launch: async (_parent, { id }, { dataSources: { launchAPI } }) => {
      return await launchAPI.getLaunchById({ launchId: id })
    },
    launches: async (_parent, { pageSize = 20, after }, { dataSources }) => {
      const allLaunches = await dataSources.launchAPI.getAllLaunches()
      // we want these in reverse chronological order
      allLaunches.reverse()

      const launches = paginateResults({
        after,
        pageSize,
        results: allLaunches,
      })

      return {
        launches,
        cursor: launches.length ? launches[launches.length - 1].cursor : null,
        // if the cursor of the end of the paginated results is the same as the
        // last item in _all_ results, then there are no more results after this
        hasMore:
          launches.length > 0 &&
          launches[launches.length - 1].cursor !== allLaunches[allLaunches.length - 1].cursor,
      }
    },
    me: async (_, __, { dataSources }) => dataSources.userAPI.findOrCreateUser(),
  },
  Mutation: {
    bookTrips: async (_parent, { launchIds }, { dataSources: { launchAPI, userAPI } }, _info) => {
      const results = await userAPI.bookTrips({ launchIds })
      const launches = await launchAPI.getLaunchesByIds({ launchIds })

      return {
        success: results && results.length === launchIds.length,
        message:
          results.length === launchIds.length
            ? 'trips booked successfully'
            : `the following launches couldn't be booked: ${launchIds.filter(
                id => !results.includes(id),
              )}`,
        launches,
      }
    },
    cancelTrip: async (_parent, { launchId }, { dataSources: { launchAPI, userAPI } }) => {
      const success = await userAPI.cancelTrip({ launchId })

      if (!success) {
        return {
          success,
          message: 'Failed to cancel trip',
        }
      }

      const deletedLaunch = await launchAPI.getLaunchById({ launchId })

      return {
        success,
        message: 'Trip cancelled',
        launches: [deletedLaunch],
      }
    },
    login: async (_parent, { email }, { dataSources }) => {
      const user = await dataSources.userAPI.findOrCreateUser({ email })
      if (user) return Buffer.from(email).toString('base64')
    },
  },
}
