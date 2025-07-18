import React from "react";
import { Link, useLocation } from "react-router-dom";

type TNavi = {
    to: string;
    name: string;
}

const NAV_ITEMS: TNavi[] = [
    { name: 'Calendar', to: '/calendar' },
    { name: 'Dashboard', to: '/dashboard' },
    { name: 'Home', to: '/' },
]

const NaviButton = ({name, to}: TNavi) => {
    return(
        <Link to={to} className="mr-5">
            <span className="text-white">{ name }</span>
        </Link>
    )
}

const Header = () => {
    const location = useLocation();
    const isHome = location.pathname === '/'; // 홈인지 여부

    const filteredNav = isHome
    ? NAV_ITEMS.filter(({ name }) => name !== "Home")
    : NAV_ITEMS;

    return (
        <header className="w-full h-12 px-5 my-2 fixed right-0 top-0 flex bg-transparent">
            <Link className=" w-20 h-full" to='/'>
                <img className="w-100 h-full my-auto" src="src/assets/logo.svg" alt="로고"/>
            </Link>
            <nav className="flex items-center ml-5">
            {filteredNav.map(({ name, to }) => (
                <NaviButton key={name} name={name} to={to} />
            ))}
        </nav>
        </header>
    )
}

export default Header;