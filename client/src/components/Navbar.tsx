import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import {MenuIcon, SearchIcon,  TicketPlus, XIcon} from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/react'
import { useAppContext } from '../context/AppContext'
const Navbar = () => {
    const [isOpen,setIsOpen] = useState(false);
    const {user} = useUser();
    const {openSignIn} = useClerk()
    const navigate = useNavigate()
    const {favoriteMovies} = useAppContext();

  return (
    <div className='fixed top-0 left-0 right-0 z-50 w-full flex items-center justify-between px-6 md:px-10 lg:px-16 py-5'>

        <Link to={'/'} className='flex-1'>
        <img src={assets.logo} alt="" className='w-36 h-auto' />
        </Link>
        
        <div className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-8 md:px-8 py-3 max-md:h-screen md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 ${isOpen ? 'max-md:w-50':'max-md:w-0'}`}>

            <XIcon className='md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer' onClick={()=>setIsOpen(!isOpen)}/>
    

            <Link to={"/"} className='relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full' onClick={()=>{scrollTo(0,0);setIsOpen(false)}} >Home</Link>

            <Link to={"/Movies"} className='relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-red-400 after:transition-all after:duration-300 hover:after:w-full' onClick={()=>{scrollTo(0,0);setIsOpen(false)}}>Movies</Link>

            <Link to={"/"} className='relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-400 after:transition-all after:duration-300 hover:after:w-full' onClick={()=>{scrollTo(0,0);setIsOpen(false)}}>Theatres</Link>

            <Link to={"/"} className='relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full' onClick={()=>{scrollTo(0,0);setIsOpen(false)}}>Releases</Link>

            {favoriteMovies.length>0 && <Link to={"/favorite"} className='relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-pink-300 after:transition-all after:duration-300 hover:after:w-full' onClick={()=>{scrollTo(0,0);setIsOpen(false)}}>Favorites</Link>}
        </div>


        <div className='flex flex-1 justify-end items-center gap-8'>
            <SearchIcon className='max-md:hidden w-6 h-6 cursor-pointer'/>
            {
                !user ? (
                     <button onClick={()=>openSignIn()} className='px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'>Login</button>
                ) : (
                    <UserButton>
                        <UserButton.MenuItems>
                            <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15}/>} onClick={()=>navigate('/my-bookings')}/>
                        </UserButton.MenuItems>
                    </UserButton>
                )
            }
           
        </div>

        <div>
            <MenuIcon className='max-md:ml-4 md:hidden w-8 h-8 cursor-pointer' onClick={() => setIsOpen(!isOpen)}/>
        </div>
    </div>
  )
}

export default Navbar