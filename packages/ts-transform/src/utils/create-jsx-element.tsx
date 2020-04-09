import * as ts from 'typescript';
import { stylis } from './stylis';
import { classNameHash } from './hash';
import { getJsxNodeAttributes, getJsxNodeAttributesValue, getIdentifierText } from './ast-node';
import { joinToJsxExpression } from './expression-operators';
import { CssVariableExpressions } from '../types';

interface JsxElementOpts {
  css: string;
  cssVariables: CssVariableExpressions[];
  skipClassName?: boolean;
  styleFactory?: (
    props: ts.PropertyAssignment[]
  ) => (ts.PropertyAssignment | ts.SpreadAssignment)[];
  classNameFactory?: (node: ts.StringLiteral) => ts.StringLiteral | ts.JsxExpression;
  jsxAttributes?: (ts.JsxAttribute | ts.JsxSpreadAttribute)[];
  children?: ts.JsxChild;
  context: ts.TransformationContext;
}

const HASH_ATTRIBUTE_NAME = 'hash';
const STYLE_ATTRIBUTE_NAME = 'style';
const CLASSNAME_PROP = 'className';

const getStyleElementName = (isCommonJs: boolean) =>
  isCommonJs
    ? (ts.createPropertyAccess(
        ts.createIdentifier('css_in_js_1'),
        ts.createIdentifier('Style')
      ) as ts.JsxTagNamePropertyAccess)
    : ts.createIdentifier('Style');

const createStyleNode = (node: ts.Node, className: string, css: string[], opts: JsxElementOpts) => {
  const STYLE_ELEMENT_NAME = getStyleElementName(
    opts.context.getCompilerOptions().module === ts.ModuleKind.CommonJS
  );
  return ts.createJsxElement(
    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(
      ts.createJsxOpeningElement(
        STYLE_ELEMENT_NAME,
        [],
        ts.createJsxAttributes([
          ts.createJsxAttribute(
            ts.createIdentifier(HASH_ATTRIBUTE_NAME),
            ts.createStringLiteral(className)
          ),
        ])
      ),
      node
    ),

    [
      ts.createJsxExpression(
        undefined,
        ts.createArrayLiteral(
          css.map(rule => ts.createStringLiteral(rule)),
          false
        )
      ),
    ],

    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(ts.createJsxClosingElement(STYLE_ELEMENT_NAME), node)
  );
};

const createFragmentNode = (node: ts.Node, styleNode: ts.JsxChild, childNode?: ts.JsxChild) => {
  return ts.createJsxFragment(
    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(ts.createJsxOpeningFragment(), node),
    [
      // important that the style goes before the node
      styleNode,
      childNode,
    ].filter(Boolean) as ts.JsxChild[],
    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(ts.createJsxJsxClosingFragment(), node)
  );
};

/**
 * Will create a jsx element that passes through `children`.

 * <React.Fragment>
 *  <Style>{[..]}</Style>
 *  {`opts.children`}
 * </React.Fragment>
 */
export const createStyleFragment = (node: ts.JsxElement, opts: JsxElementOpts) => {
  const className = classNameHash(opts.css);
  const compiledCss: string[] = stylis(opts.skipClassName ? `.${className}` : '', opts.css);
  const styleNode = createStyleNode(node, className, compiledCss, opts);

  return createFragmentNode(node, styleNode, opts.children);
};

/**
 * Will create a jsx element based on the input `tagName` string.
 *
 * Output:
 *
 * <React.Fragment>
 *   <Style>{[..]}</Style>
 *   <`tagName`>{`opts.children`}</`tagName`>
 * </React.Fragment>
 */
export const createJsxElement = (tagName: string, opts: JsxElementOpts & { node: ts.Node }) => {
  const className = classNameHash(opts.css);
  const compiledCss: string[] = stylis(`.${className}`, opts.css);

  // Create the style element that will precede the node that had the css prop.
  const styleNode = createStyleNode(opts.node, className, compiledCss, opts);

  const elementNode = ts.createJsxElement(
    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(
      ts.createJsxOpeningElement(
        ts.createIdentifier(tagName),
        [],
        ts.createJsxAttributes([
          ...(opts.jsxAttributes || []),
          // className should always be last
          ts.createJsxAttribute(
            ts.createIdentifier('className'),
            opts.classNameFactory
              ? opts.classNameFactory(ts.createStringLiteral(className))
              : ts.createStringLiteral(className)
          ),
        ])
      ),
      opts.node
    ),
    opts.children ? [opts.children] : [],
    // We use setOriginalNode() here to work around createJsx not working without the original node.
    // See: https://github.com/microsoft/TypeScript/issues/35686
    ts.setOriginalNode(ts.createJsxClosingElement(ts.createIdentifier(tagName)), opts.node)
  );

  if (opts.cssVariables.length) {
    const styleProps = opts.cssVariables.map(variable => {
      return ts.createPropertyAssignment(
        ts.createStringLiteral(variable.name),
        variable.expression
      );
    });

    const elementNodeAttributes = getJsxNodeAttributes(elementNode);
    (elementNodeAttributes.properties as any).push(
      ts.createJsxAttribute(
        ts.createIdentifier(STYLE_ATTRIBUTE_NAME),
        ts.createJsxExpression(
          undefined,
          ts.createObjectLiteral(
            opts.styleFactory ? opts.styleFactory(styleProps) : styleProps,
            false
          )
        )
      )
    );
  }

  return createFragmentNode(opts.node, styleNode, elementNode);
};

/**
 * Will create a jsx element based on the input jsx element `node`.
 *
 * Output:
 *
 * <React.Fragment>
 *   <Style>{[..]}</Style>
 *   <`node.openingElement.tagName`>{`opts.children`}</`node.closingElement.tagName`>
 * </React.Fragment>
 */
export const createJsxElementFromNode = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  opts: JsxElementOpts & { propsToRemove?: string[] }
) => {
  const className = classNameHash(opts.css);
  const suppliedClassNameAttribute = getJsxNodeAttributesValue(node, CLASSNAME_PROP);
  const compiledCss: string[] = stylis(`.${className}`, opts.css);
  const openingElement = ts.isJsxSelfClosingElement(node) ? node : node.openingElement;

  let classNameInitializer: ts.JsxExpression | ts.StringLiteral = ts.createStringLiteral(className);

  if (suppliedClassNameAttribute && ts.isJsxExpression(suppliedClassNameAttribute)) {
    classNameInitializer = joinToJsxExpression(
      ts.createStringLiteral(className),
      suppliedClassNameAttribute.expression!
    );
  } else if (suppliedClassNameAttribute && ts.isStringLiteral(suppliedClassNameAttribute)) {
    classNameInitializer = joinToJsxExpression(
      ts.createStringLiteral(className),
      suppliedClassNameAttribute
    );
  }

  const previousStyleAttribute = openingElement.attributes.properties.filter(
    prop => prop.name && getIdentifierText(prop.name) === STYLE_ATTRIBUTE_NAME
  )[0];
  let previousStyleProps: ts.ObjectLiteralElementLike[] = [];

  if (
    previousStyleAttribute &&
    ts.isJsxAttribute(previousStyleAttribute) &&
    previousStyleAttribute.initializer &&
    ts.isJsxExpression(previousStyleAttribute.initializer) &&
    previousStyleAttribute.initializer.expression &&
    ts.isObjectLiteralExpression(previousStyleAttribute.initializer.expression)
  ) {
    previousStyleProps = previousStyleAttribute.initializer.expression.properties.map(x => x);
  }

  const attributes = [
    // Filter out css prop, carry over others
    ...openingElement.attributes.properties.filter(
      prop =>
        prop.name &&
        !(opts.propsToRemove || []).includes(getIdentifierText(prop.name)) &&
        getIdentifierText(prop.name) !== CLASSNAME_PROP &&
        getIdentifierText(prop.name) !== STYLE_ATTRIBUTE_NAME
    ),
    // Reference style via className
    ts.createJsxAttribute(ts.createIdentifier('className'), classNameInitializer),

    // Add a style prop if css variables are applied
    opts.cssVariables.length
      ? ts.createJsxAttribute(
          ts.createIdentifier(STYLE_ATTRIBUTE_NAME),
          ts.createJsxExpression(
            undefined,
            ts.createObjectLiteral(
              previousStyleProps.concat(
                opts.cssVariables.map(cssVariable =>
                  ts.createPropertyAssignment(
                    ts.createStringLiteral(cssVariable.name),
                    cssVariable.expression
                  )
                )
              )
            )
          )
        )
      : undefined,
  ].filter(
    (item): item is ts.JsxAttribute => typeof item !== 'undefined' && ts.isJsxAttribute(item)
  );

  // Create the style element that will precede the node that had the css prop.
  const styleNode = createStyleNode(node, className, compiledCss, opts);

  return createFragmentNode(
    node,
    styleNode,
    ts.isJsxSelfClosingElement(node)
      ? ts.setOriginalNode(
          ts.createJsxSelfClosingElement(
            node.tagName,
            node.typeArguments,
            ts.createJsxAttributes(attributes)
          ),
          node
        )
      : ts.createJsxElement(
          ts.setOriginalNode(
            ts.createJsxOpeningElement(
              node.openingElement.tagName,
              node.openingElement.typeArguments,
              ts.createJsxAttributes(attributes)
            ),
            node
          ),
          node.children,
          ts.setOriginalNode(ts.createJsxClosingElement(node.closingElement.tagName), node)
        )
  );
};
