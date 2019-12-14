import * as ts from 'typescript';
import kebabCase from '../../utils/kebab-case';
import { VariableDeclarations, CssVariableExpressions } from '../types';
import { nextCssVariableName } from '../../utils/identifiers';
import * as logger from '../../utils/log';

export const objectLiteralToCssString = (
  objectLiteral: ts.ObjectLiteralExpression,
  scopedVariables: VariableDeclarations
) => {
  const properties = objectLiteral.properties;
  let cssVariables: CssVariableExpressions[] = [];

  const css: string = properties.reduce((acc, prop) => {
    // if is spread

    let key: string;
    let value: string;

    if (ts.isSpreadAssignment(prop)) {
      // Ok it's a spread e.g. "...prop"

      // Reference to the identifier that we are spreading in, e.g. "prop".
      const variableDeclaration = scopedVariables[prop.expression.getText()];
      if (
        !variableDeclaration ||
        !variableDeclaration.initializer ||
        !ts.isObjectLiteralExpression(variableDeclaration.initializer)
      ) {
        throw new Error('variable doesnt exist in scope');
      }
      // Spread can either be from an object, or a function. Probably not an array.

      const result = objectLiteralToCssString(variableDeclaration.initializer, scopedVariables);
      cssVariables = cssVariables.concat(result.cssVariables);

      return `${acc}
      ${result.css}
      `;
    } else if (
      ts.isShorthandPropertyAssignment(prop) ||
      (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.initializer))
    ) {
      key = kebabCase(prop.name.getText());

      // We have a prop assignment using a variable, e.g. "fontSize: props.fontSize" or "fontSize".
      // Time to turn it into a css variable.
      const cssVariable = `--${key}-${nextCssVariableName()}`;
      value = `var(${cssVariable})`;
      cssVariables.push({
        name: cssVariable,
        expression: 'initializer' in prop ? prop.initializer : prop.name,
      });
    } else if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) {
      key = kebabCase((prop.name as ts.Identifier).text);

      // We found an object selector, e.g. ":hover": { color: 'red' }
      const result = objectLiteralToCssString(prop.initializer, scopedVariables);
      cssVariables = cssVariables.concat(result.cssVariables);

      return `${acc}
      ${key} {
        ${result.css}
      }
      `;
    } else if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer)) {
      // We have a regular static assignment, e.g. "fontSize: '20px'"
      key = kebabCase(prop.name.getText());
      value = `${prop.initializer.text}`;
    } else {
      logger.log('unsupported value in css prop object');
      key = prop.name ? kebabCase(prop.name.getText()) : 'unspported';
      value = 'unsupported';
    }

    return `${acc}
      ${key}: ${value};`;
  }, '');

  return {
    cssVariables,
    css,
  };
};
