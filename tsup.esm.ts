import createConfig from '@trust0/ridb-build';
import source from './source';
export default createConfig({
  format:[ 'esm'],
  entry: source,
});
