import { list } from '../repositories/SchemaVersion'

export class SchemaVersionService {
  async findLatestVersion(graphName: string, serviceName: string) {
    const all = await list(graphName, serviceName)
    // because list is lexicographically sorted
    return all[0]
  }
}
