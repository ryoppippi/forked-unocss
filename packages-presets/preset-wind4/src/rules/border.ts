import type { CSSEntries, CSSObject, CSSValueInput, Rule, RuleContext } from '@unocss/core'
import type { Theme } from '../theme'
import { notNull, uniq } from '@unocss/core'
import { colorCSSGenerator, cornerMap, directionMap, globalKeywords, h, hasParseableColor, isCSSMathFn, parseColor, passThemeKey, SpecialColorKey, themeTracking } from '../utils'

export const borderStyles = ['solid', 'dashed', 'dotted', 'double', 'hidden', 'none', 'groove', 'ridge', 'inset', 'outset', ...globalKeywords]

export const borders: Rule<Theme>[] = [
  // compound
  [/^(?:border|b)()(?:-(.+))?$/, handlerBorderSize, { autocomplete: '(border|b)-<directions>' }],
  [/^(?:border|b)-([xy])(?:-(.+))?$/, handlerBorderSize],
  [/^(?:border|b)-([rltbse])(?:-(.+))?$/, handlerBorderSize],
  [/^(?:border|b)-(block|inline)(?:-(.+))?$/, handlerBorderSize],
  [/^(?:border|b)-([bi][se])(?:-(.+))?$/, handlerBorderSize],

  // size
  [/^(?:border|b)-()(?:width|size)-(.+)$/, handlerBorderSize, { autocomplete: ['(border|b)-<num>', '(border|b)-<directions>-<num>'] }],
  [/^(?:border|b)-([xy])-(?:width|size)-(.+)$/, handlerBorderSize],
  [/^(?:border|b)-([rltbse])-(?:width|size)-(.+)$/, handlerBorderSize],
  [/^(?:border|b)-(block|inline)-(?:width|size)-(.+)$/, handlerBorderSize],
  [/^(?:border|b)-([bi][se])-(?:width|size)-(.+)$/, handlerBorderSize],

  // colors
  [/^(?:border|b)-()(?:color-)?(.+)$/, handlerBorderColorOrSize, { autocomplete: ['(border|b)-$colors', '(border|b)-<directions>-$colors'] }],
  [/^(?:border|b)-([xy])-(?:color-)?(.+)$/, handlerBorderColorOrSize],
  [/^(?:border|b)-([rltbse])-(?:color-)?(.+)$/, handlerBorderColorOrSize],
  [/^(?:border|b)-(block|inline)-(?:color-)?(.+)$/, handlerBorderColorOrSize],
  [/^(?:border|b)-([bi][se])-(?:color-)?(.+)$/, handlerBorderColorOrSize],

  // opacity
  [/^(?:border|b)-()op(?:acity)?-?(.+)$/, handlerBorderOpacity, { autocomplete: '(border|b)-(op|opacity)-<percent>' }],
  [/^(?:border|b)-([xy])-op(?:acity)?-?(.+)$/, handlerBorderOpacity],
  [/^(?:border|b)-([rltbse])-op(?:acity)?-?(.+)$/, handlerBorderOpacity],
  [/^(?:border|b)-(block|inline)-op(?:acity)?-?(.+)$/, handlerBorderOpacity],
  [/^(?:border|b)-([bi][se])-op(?:acity)?-?(.+)$/, handlerBorderOpacity],

  // radius
  [/^(?:border-|b-)?(?:rounded|rd)()(?:-(.+))?$/, handlerRounded, { autocomplete: ['(border|b)-(rounded|rd)', '(border|b)-(rounded|rd)-$radius', '(rounded|rd)', '(rounded|rd)-$radius'] }],
  [/^(?:border-|b-)?(?:rounded|rd)-([rltbse])(?:-(.+))?$/, handlerRounded],
  [/^(?:border-|b-)?(?:rounded|rd)-([rltb]{2})(?:-(.+))?$/, handlerRounded],
  [/^(?:border-|b-)?(?:rounded|rd)-([bise][se])(?:-(.+))?$/, handlerRounded],
  [/^(?:border-|b-)?(?:rounded|rd)-([bi][se]-[bi][se])(?:-(.+))?$/, handlerRounded],

  // style
  [/^(?:border|b)-(?:style-)?()(.+)$/, handlerBorderStyle, { autocomplete: ['(border|b)-style', `(border|b)-(${borderStyles.join('|')})`, '(border|b)-<directions>-style', `(border|b)-<directions>-(${borderStyles.join('|')})`, `(border|b)-<directions>-style-(${borderStyles.join('|')})`, `(border|b)-style-(${borderStyles.join('|')})`] }],
  [/^(?:border|b)-([xy])-(?:style-)?(.+)$/, handlerBorderStyle],
  [/^(?:border|b)-([rltbse])-(?:style-)?(.+)$/, handlerBorderStyle],
  [/^(?:border|b)-(block|inline)-(?:style-)?(.+)$/, handlerBorderStyle],
  [/^(?:border|b)-([bi][se])-(?:style-)?(.+)$/, handlerBorderStyle],
]

function borderColorResolver(direction: string) {
  return ([, body]: string[], theme: Theme): [CSSObject, string?] | undefined => {
    const data = parseColor(body, theme)
    const result = colorCSSGenerator(data, `border${direction}-color`, 'border')

    if (result) {
      const css = result[0]

      if (
        data?.color && !Object.values(SpecialColorKey).includes(data.color)
        && direction && direction !== ''
      ) {
        css[`--un-border${direction}-opacity`] = `var(--un-border-opacity)`
      }

      return result
    }
  }
}

function handlerBorderSize([, a = '', b = '1']: string[]): CSSEntries | undefined {
  const v = h.bracket.cssvar.global.px(b)
  if (a in directionMap && v != null)
    return directionMap[a].map(i => [`border${i}-width`, v])
}

function handlerBorderColorOrSize([, a = '', b]: string[], ctx: RuleContext<Theme>): CSSEntries | (CSSValueInput | string)[] | undefined {
  if (a in directionMap) {
    if (isCSSMathFn(h.bracket(b)))
      return handlerBorderSize(['', a, b])

    if (hasParseableColor(b, ctx.theme)) {
      return directionMap[a].map(i => borderColorResolver(i)(['', b], ctx.theme))
        .filter(notNull)
        .reduce((acc, item) => {
          // Merge multiple direction CSSObject into one
          Object.assign(acc[0], item[0])
          acc[1] = uniq([acc[1], item[1]]).join('')
          return acc.filter(Boolean) as [CSSObject, string?]
        }, [{}]) as (CSSValueInput | string)[]
    }
  }
}

function handlerBorderOpacity([, a = '', opacity]: string[]): CSSEntries | undefined {
  const v = h.bracket.percent.cssvar(opacity)
  if (a in directionMap && v != null)
    return directionMap[a].map(i => [`--un-border${i}-opacity`, v])
}

function handlerRounded([, a = '', s]: string[], { theme }: RuleContext<Theme>): CSSEntries | undefined {
  if (a in cornerMap) {
    const _s = s || 'DEFAULT'
    if (_s === 'full')
      return cornerMap[a].map(i => [`border${i}-radius`, 'calc(infinity * 1px)'])

    const _v = theme.radius?.[_s] ?? h.bracket.cssvar.global.fraction.rem(_s || '1')
    if (_v != null) {
      const isVar = theme.radius && _s in theme.radius && !passThemeKey.includes(_s)
      if (isVar) {
        themeTracking(`radius`, _s)
      }

      return cornerMap[a].map(i => [
        `border${i}-radius`,
        isVar ? `var(--radius-${_s})` : _v,
      ])
    }
  }
}

export function handlerBorderStyle([, a = '', s]: string[]): CSSEntries | undefined {
  if (borderStyles.includes(s) && a in directionMap) {
    return [
      ['--un-border-style', s],
      ...directionMap[a].map(i => [`border${i}-style`, s]) as CSSEntries,
    ]
  }
}
