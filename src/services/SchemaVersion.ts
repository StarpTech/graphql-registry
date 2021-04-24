import { list } from '../repositories/SchemaVersion'

export class SchemaVersionService {
  async findLatestVersion(serviceName: string) {
    const all = await list(serviceName)
    // because list is lexicographically sorted
    return all[0]
  }
}
