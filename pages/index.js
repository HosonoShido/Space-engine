import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient" 
import GlobeComponent from "../components/Globe"

export default function Home() {
  const [ companies, setCompanies ] = useState([])

  useEffect(() =>{
    const fetchCompanies = async() => {
      const { data, error } = await supabase.from("companies").select("*")
      if (error) { console.error("エラー:",error) }
      else {
        const formatted = data.map(company => ({
          latitude: company.latitude,
          longitude: company.longitude,
          name: company.name,
          flag_code: company.flag_code,
          id: company.id,
          description: company.description,
        }))
        setCompanies(formatted)
      }
    }
    fetchCompanies()
  },[])

  return (
    <div>
      <h1>🌎世界市場</h1>
      <GlobeComponent points={companies}/>
    </div>
  )
}


