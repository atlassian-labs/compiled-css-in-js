import { transformSync, TransformOptions } from '@babel/core';
import babelNext from '../index';

const babelOpts: TransformOptions = {
  configFile: false,
  babelrc: false,
  plugins: [babelNext],
};

describe('babel plugin', () => {
  it('should generate fallback file comment when filename is not defined', () => {
    const output = transformSync(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      babelOpts
    );

    expect(output.code).toInclude('/* File generated by @compiled/babel-plugin v0.4.7 */');
  });

  it('should generate fallback file comment when filename is defined', () => {
    const output = transformSync(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      {
        ...babelOpts,
        filename: 'packages/babel-plugin/src/__tests__/index.test.tsx',
      }
    );

    expect(output.code).toInclude('index.test.tsx generated by @compiled/babel-plugin v0.4.7');
  });

  it('should not change code where there is no compiled components', () => {
    const output = transformSync(
      `
      const one = 1;
    `,
      babelOpts
    );

    expect(output?.code).toEqual('const one = 1;');
  });

  it('should transform basic styled component', () => {
    const output = transformSync(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      babelOpts
    );

    expect(output?.code).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.4.7 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wyb1fwx{font-size:12px}\\";
      const MyDiv = React.forwardRef(({
        as: C = \\"div\\",
        style,
        ...props
      }, ref) => <CC>
            <CS>{[_]}</CS>
            <C {...props} style={style} ref={ref} className={ax([\\"_1wyb1fwx\\", props.className])} />
          </CC>);"
    `);
  });

  it('should transform basic css prop', () => {
    const output = transformSync(
      `
      import '@compiled/react';

      const MyDiv = () => {
        return <div css="font-size:12px;">hello</div>
      };
    `,
      babelOpts
    );

    expect(output?.code).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.4.7 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wyb1fwx{font-size:12px}\\";

      const MyDiv = () => {
        return <CC>
          <CS>{[_]}</CS>
          {<div className={ax([\\"_1wyb1fwx\\"])}>hello</div>}
        </CC>;
      };"
    `);
  });
});
