import { ax } from '@compiled/runtime';
import { newAx, newAxCache } from './ax-playground';
import Benchmark, { Event as BenchmarkEvent } from 'benchmark';

console.log('Start ax benchmarking');
console.log();

const suite = new Benchmark.Suite('ax');

suite
  .add('ax() array', () => {
    ax([
      '_19itglyw',
      '_2rko1l7b',
      '_ca0qftgi',
      '_u5f319bv',
      '_n3tdftgi',
      '_19bv19bv',
      '_bfhk1mzw',
      '_syazu67f',
      '_k48p1nn1',
      '_ect41kw7',
      '_1wybdlk8',
      '_irr3mlcl',
      '_1di6vctu',
      undefined,
    ]);
  })
  .add('ax() single string', () => {
    ax([
      '_19itglyw _2rko1l7b _ca0qftgi _u5f319bv _n3tdftgi _19bv19bv _bfhk1mzw _syazu67f _k48p1nn1 _ect41kw7 _1wybdlk8 _irr3mlcl _1di6vctu',
      undefined,
    ]);
  })
  .add('newAx() array', () => {
    newAx([
      '_19itglyw',
      '_2rko1l7b',
      '_ca0qftgi',
      '_u5f319bv',
      '_n3tdftgi',
      '_19bv19bv',
      '_bfhk1mzw',
      '_syazu67f',
      '_k48p1nn1',
      '_ect41kw7',
      '_1wybdlk8',
      '_irr3mlcl',
      '_1di6vctu',
      undefined,
    ]);
  })
  .add('newAx() single string', () => {
    newAx([
      '_19itglyw _2rko1l7b _ca0qftgi _u5f319bv _n3tdftgi _19bv19bv _bfhk1mzw _syazu67f _k48p1nn1 _ect41kw7 _1wybdlk8 _irr3mlcl _1di6vctu',
      undefined,
    ]);
  })
  .add('newAxCache() array', () => {
    newAxCache([
      '_19itglyw',
      '_2rko1l7b',
      '_ca0qftgi',
      '_u5f319bv',
      '_n3tdftgi',
      '_19bv19bv',
      '_bfhk1mzw',
      '_syazu67f',
      '_k48p1nn1',
      '_ect41kw7',
      '_1wybdlk8',
      '_irr3mlcl',
      '_1di6vctu',
      undefined,
    ]);
  })
  .add('newAxCache() single string', () => {
    newAxCache([
      '_19itglyw _2rko1l7b _ca0qftgi _u5f319bv _n3tdftgi _19bv19bv _bfhk1mzw _syazu67f _k48p1nn1 _ect41kw7 _1wybdlk8 _irr3mlcl _1di6vctu',
      undefined,
    ]);
  })
  .on('cycle', (event: BenchmarkEvent) => {
    console.log('==> ', String(event.target));
  })
  .on('complete', () => {
    console.log();
    console.log(`Fastest is ${suite.filter('fastest').map(({ name }: { name: string }) => name)}`);
  })
  .run({ async: true });
