
interface TitleProps{
    text1:string;
    text2:string;
}

const Title = ({text1,text2}:TitleProps) => {
  return (
    <h1 className="font-medium text-2xl">
        {text1} <span className="underline text-primary">{text2}</span>
    </h1>
  )
}

export default Title