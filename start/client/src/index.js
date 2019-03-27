import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'

const cache = new InMemoryCache()
const link = new HttpLink({ uri: 'https://fullstack-tutorial-server-bpmxvhumbk.now.sh/' })

const client = new ApolloClient({ cache, link })

client
  .query({
    query: gql`
      query GetLaunch {
        launch(id: 56) {
          id
          mission {
            name
          }
        }
      }
    `,
  })
  .then(result => console.log(result))
