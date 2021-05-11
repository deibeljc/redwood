import type { types } from '@babel/core'
import { parse as babelParse } from '@babel/parser'
import traverse from '@babel/traverse'

// We're using babel to parse the AST, but there's no reason why this wouldn't change
// in the future, so we're creating abstractions that are easier to use and switchable.

const parse = (code: string) =>
  babelParse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] })

interface NamedExports {
  name: string
  type: 're-export' | 'variable' | 'function' | 'class'
}
/**
 * get all the named exports in a given piece of code.
 */
export const getNamedExports = (code: string): NamedExports[] => {
  const namedExports: NamedExports[] = []
  traverse(parse(code), {
    ExportNamedDeclaration(path) {
      // Re-exports from other modules
      // Eg: export { a, b } from './module'
      const specifiers = path.node?.specifiers
      if (specifiers.length) {
        for (const s of specifiers) {
          const id = s.exported as types.Identifier
          namedExports.push({
            name: id.name,
            type: 're-export',
          })
        }
        return
      }

      const declaration = path.node.declaration
      if (!declaration) {
        return
      }

      if (declaration.type === 'VariableDeclaration') {
        const id = declaration.declarations[0].id as types.Identifier
        namedExports.push({
          name: id.name as string,
          type: 'variable',
        })
      } else if (declaration.type === 'FunctionDeclaration') {
        namedExports.push({
          name: declaration?.id?.name as string,
          type: 'function',
        })
      } else if (declaration.type === 'ClassDeclaration') {
        namedExports.push({
          name: declaration?.id?.name,
          type: 'class',
        })
      }
    },
  })

  return namedExports
}

export const hasDefaultExport = (code: string): boolean => {
  let exported = false
  traverse(parse(code), {
    ExportDefaultDeclaration() {
      exported = true
      return
    },
  })
  return exported
}
