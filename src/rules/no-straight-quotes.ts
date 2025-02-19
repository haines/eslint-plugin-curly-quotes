import { AST } from "vue-eslint-parser"
import { JSXText, Node as BaseNode } from "@babel/types"
import { Literal, Node, TemplateLiteral } from "estree"
import { Rule } from "eslint"
import getIgnoredIndexRanges from "../lib/getIgnoredIndexRanges"
import replaceQuotes from "../lib/replaceQuotes"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce the use of curly quotes",
    },
    messages: {
      preferCurlyQuotes: "Prefer the use of curly quotes",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          "single-opening": {
            type: "string",
            description: "Single opening typographic quotation mark",
          },
          "single-closing": {
            type: "string",
            description: "Single closing typographic quotation mark",
          },
          "double-opening": {
            type: "string",
            description: "Double opening typographic quotation mark",
          },
          "double-closing": {
            type: "string",
            description: "Double closing typographic quotation mark",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create: context => {
    function handleNode(
      node: AST.Node | BaseNode | Node,
      textTrimValue: number
    ) {
      const text = context.getSourceCode().getText(node as Node)
      const ignoredIndexRanges = getIgnoredIndexRanges(node as Node) // e.g. expressions in template literals

      // Filter out unwanted characters (e.g. expressions in template literals).
      const filteredText = text
        .split("")
        .filter((_char, index) => {
          for (const range of ignoredIndexRanges)
            if (range[0] <= index && index < range[1]) return false
          return true
        })
        .join("")

      // Trim text to ignore string delimiters.
      const trimmedText = filteredText.substring(
        textTrimValue,
        text.length - textTrimValue
      )

      const includesStraightQuotes =
        trimmedText.includes("'") || trimmedText.includes('"')

      if (!includesStraightQuotes) return

      context.report({
        node: node as Node,
        messageId: "preferCurlyQuotes",
        fix(fixer) {
          let fixedText = replaceQuotes(
            text,
            textTrimValue,
            "'",
            context.options[0]?.["single-opening"] ?? "‘",
            context.options[0]?.["single-closing"] ?? "’",
            ignoredIndexRanges
          )
          fixedText = replaceQuotes(
            fixedText,
            textTrimValue,
            '"',
            context.options[0]?.["double-opening"] ?? "“",
            context.options[0]?.["double-closing"] ?? "”",
            ignoredIndexRanges
          )

          return fixer.replaceText(node as Node, fixedText)
        },
      })
    }

    // Vue.js
    if (context.parserServices.defineTemplateBodyVisitor) {
      return context.parserServices.defineTemplateBodyVisitor(
        // Event handlers for <template>.
        {
          Literal: (node: AST.ESLintLiteral) => handleNode(node, 1),
          TemplateLiteral: (node: AST.ESLintTemplateLiteral) =>
            handleNode(node, 1),
          VLiteral: (node: AST.VLiteral) => handleNode(node, 1),
          VText: (node: AST.VText) => handleNode(node, 0),
        },
        // Event handlers for <script> or scripts.
        {
          JSXText: (node: JSXText) => handleNode(node, 0),
          Literal: (node: AST.ESLintLiteral) => handleNode(node, 1),
          TemplateLiteral: (node: AST.ESLintTemplateLiteral) =>
            handleNode(node, 1),
        }
      )
    }

    return {
      JSXText: (node: JSXText) => handleNode(node, 0),
      Literal: (node: Literal) => handleNode(node, 1),
      TemplateLiteral: (node: TemplateLiteral) => handleNode(node, 1),
    }
  },
}

export default rule
