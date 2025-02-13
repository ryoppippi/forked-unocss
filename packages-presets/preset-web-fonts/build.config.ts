import { defineBuildConfig } from 'unbuild'
import { aliasVirtual } from '../../alias'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/local',
  ],
  clean: true,
  declaration: true,
  alias: aliasVirtual,
})
