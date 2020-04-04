import './style.css'
import Link from '../Link'
import SmartLink from '../SmartLink'
import { Navigate, OpenMenu, CloseMenu } from '../../actions'
import { Select } from '../../effects'

const OnSearch = (state, ev) => {
  ev.preventDefault()
  return Navigate(
    state,
    `/search?q=${encodeURI(ev.target.search.value)}`,
    Select({selector: '#search'})
  )
}

const OnFocus = (state, ev) => {
  return [
    state,
    Select({selector: '#search'})
  ]
}

export default ({ menuOpened, location }) => {
  return (
    <header class={{
      'site-header': true,
      opened: menuOpened
    }}>
      <Link to="/" class="logo">
        <img class="v2 mobile" src={require('./logo-big.svg')} alt="hyperapp v2" />
        <img class="v2 desktop" src={require('./hyperapp-logo-v2.svg')} alt="hyperapp v2" />
        <img class="v1" src={require('./hyperapp-logo-v1.svg')} alt="hyperapp v1" />
      </Link>
      <button class="menu-toggler" aria-expanded={menuOpened} aria-controls="menu" onclick={menuOpened ? CloseMenu : OpenMenu}>
        Menu
        {menuOpened
          ? <img src={require('./close.svg')} alt="Close menu" />
          : <img src={require('./menu.svg')} alt="Open menu" />
        }
      </button>
      <nav id="menu" class={{
        menu: true,
        opened: menuOpened
      }}>
        <SmartLink to="/">hyperapp</SmartLink>
        <SmartLink to="/tutorial">tutorial</SmartLink>
        <SmartLink to="/ecosystem">ecosystem</SmartLink>
        <SmartLink to="/sponsor">sponsor</SmartLink>
        <SmartLink to="/guides">guides</SmartLink>
        <SmartLink to="/api">api</SmartLink>
        <form
          class="search-form"
          onsubmit={OnSearch}
        >
          <input
            type="text"
            id="search"
            name="search"
            class="search-field"
            placeholder="search"
            value={location.queryParams.q}
            onfocus={OnFocus}
            required
          />
        </form>
      </nav>
    </header>
  )
}
