import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { brandStyles } from 'src/brandkit/common/constants'
import { I18nProps, NameSpaces, withNamespaces } from 'src/i18n'
import Octocat from 'src/icons/Octocat'
import LogoLightBg from 'src/logos/LogoLightBg'
import Button, { BTN } from 'src/shared/Button.3'
import menuItems, { CeloLinks } from 'src/shared/menu-items'
import { colors, fonts, standardStyles } from 'src/styles'

export default withNamespaces(NameSpaces.common)(function TopBar({ t }: I18nProps) {
  return (
    <View style={[brandStyles.bottomBorder, standardStyles.centered]}>
      <View style={[standardStyles.row, styles.container]}>
        <a href={menuItems.BRAND.link}>
          <TouchableOpacity style={standardStyles.row}>
            <LogoLightBg height={30} />
            <Text style={[fonts.h3, styles.title]}>Brand Kit</Text>
          </TouchableOpacity>
        </a>
        <Button
          kind={BTN.NAV}
          href={CeloLinks.gitHub}
          text={t('github')}
          target={'_blank'}
          iconRight={<Octocat size={22} color={colors.dark} />}
        />
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  title: {
    marginLeft: 20,
  },
  container: {
    maxWidth: 1600,
    backgroundColor: colors.white,
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
})