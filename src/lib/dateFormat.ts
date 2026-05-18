interface dateFormatProps{
    date:any
}

export const dateFormat = ({date}:dateFormatProps) =>{
    return new Date(date).toLocaleString('en-US',{
        weekday:'short',
        month:'long',
        day:'numeric',
        hour:'numeric',
        minute:'numeric'
    })
}