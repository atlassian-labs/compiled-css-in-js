import { transform } from '../transform';

describe('transform()', () => {
  it('should ensure only unique included files are returned', async () => {
    const result = await transform(
      `
import '@compiled/react';
import { primary, secondary } from '../__fixtures__/mixins/simple';
import { colors } from '../__fixtures__/mixins/objects';

const Component = (props) => {
  return <div css={\`fill: \${secondary}; color: \${primary}; background-color: \${colors.primary};\`} />
};
    `,
      { filename: process.cwd() + '/packages/babel-plugin/src/__tests__/transform.test.js' }
    );

    expect(result.includedFiles).toMatchInlineSnapshot(`
      Array [
        "/Users/mdougall/projects/compiled/packages/babel-plugin/src/__fixtures__/mixins/simple.js",
        "/Users/mdougall/projects/compiled/packages/babel-plugin/src/__fixtures__/mixins/objects.js",
      ]
    `);
  });
});
