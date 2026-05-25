import { StarIcon } from 'lucide-react'
import React, { createContext, useState, useContext, useRef, useEffect, type ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import timeFormat from '../lib/timeFormat'
import { useAppContext } from '../context/AppContext'
import type { Movie } from '../lib/types'
// ── Helper ────────────────────────────────────────────────────
const cx = (...classes: (string | undefined | false)[]): string =>
  classes.filter(Boolean).join(' ')

// ── Types ─────────────────────────────────────────────────────


// ── 3D Context ────────────────────────────────────────────────
type MouseEnterContextType = [boolean, React.Dispatch<React.SetStateAction<boolean>>]

const MouseEnterContext = createContext<MouseEnterContextType | undefined>(undefined)

const useMouseEnter = (): MouseEnterContextType => {
  const context = useContext(MouseEnterContext)
  if (context === undefined)
    throw new Error('useMouseEnter must be used within a MouseEnterProvider')
  return context
}

// ── CardItem ──────────────────────────────────────────────────
interface CardItemProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType
  children: React.ReactNode
  className?: string
  translateX?: number
  translateY?: number
  translateZ?: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
}

const CardItem = ({
  as: Tag = 'div',
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: CardItemProps) => {
  const ref = useRef<HTMLElement>(null)
  const [isMouseEntered] = useMouseEnter()

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.transform = isMouseEntered
      ? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
      : 'translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)'
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ])

  return (
    <Tag
      ref={ref}
      className={cx('w-fit transition duration-200 ease-linear', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// ── MovieCard ─────────────────────────────────────────────────
interface MovieCardProps {
  movie: Movie
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const navigate = useNavigate()
  const {image_base_url} = useAppContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMouseEntered, setIsMouseEntered] = useState<boolean>(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) / 18
    const y = (e.clientY - top - height / 2) / 18
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`
  }

  const handleMouseLeave = (): void => {
    if (!containerRef.current) return
    setIsMouseEntered(false)
    containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)'
  }

  const goToMovie = (): void => {
    navigate(`/movies/${movie._id}`)
    scrollTo(0, 0)
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div style={{ perspective: '1000px' }}>
        <div
          ref={containerRef}
          onMouseEnter={() => setIsMouseEntered(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative transition-all duration-200 ease-linear"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="flex flex-col justify-between p-3 bg-gray-800 w-66 rounded-2xl shadow-2xl"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <CardItem translateZ={60} className="w-full">
              <img
                onClick={goToMovie}
                src={image_base_url + movie?.backdrop_path}
                alt={movie.title}
                className="rounded-lg h-52 w-full object-cover object-right-bottom cursor-pointer"
              />
            </CardItem>

            <CardItem translateZ={40} className="w-full mt-2">
              <p className="font-semibold truncate">{movie.title}</p>
            </CardItem>

            <CardItem translateZ={30} className="w-full">
              <p className="text-sm text-gray-400 mt-2">
                {new Date(movie.release_date).getFullYear()} •{' '}
                {movie.genres.slice(0, 2).map((g) => g.name).join(' | ')} • {' '} • {timeFormat({minutes:movie.runtime})}
                 {/* {movie.runtime} */}
              </p>
            </CardItem>

            <CardItem translateZ={80} className="w-full">
              <div className="flex items-center justify-between mt-4 pb-3">
                <button
                  onClick={goToMovie}
                  className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
                >
                  Buy Tickets
                </button>
                <p className="flex items-center gap-1 text-sm text-gray-400 pr-1">
                  <StarIcon className="w-4 h-4 text-primary fill-primary" />
                  {movie.vote_average.toFixed(1)}
                </p>
              </div>
            </CardItem>
          </div>
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

export default MovieCard