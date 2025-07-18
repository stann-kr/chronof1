import React from "react";
import { FaGithub } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="w-full fixed right-0 bottom-0 flex items-center pr-5 pl-5 my-3 bg-transparent">
            <div className="p-3">
                <FaGithub className="w-6 h-6" />
            </div>
            <p className="text-left text-[10px]">This site is an unofficial, non-commercial fan project created for educational portfolio purposes and is not affiliated with Formula 1®, the FIA, or Formula One Management. Data is sourced from the OpenF1 API and the Ergast Developer API and is provided “as is,” without any guarantee of accuracy or completeness. “F1,” “Formula 1,” and all team and driver names and logos are trademarks of their respective owners. Source code is released under the MIT License.</p>
        </footer>
    )
}

export default Footer;