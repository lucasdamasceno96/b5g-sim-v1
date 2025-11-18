import AboutMapsModal from "../components/AboutMapsModal";
export default function MapGeneratorPage() {
  // No futuro:
  // const [city, setCity] = useState("")
  // const [size, setSize] = useState(2)
  // const [loading, setLoading] = useState(false)
  // const [message, setMessage] = useState("")

  // const handleGenerate = async () => {
  //   setLoading(true)
  //   try {
  //     const response = await axios.post(
  //       `${API_BASE_URL}/api/utils/generate-map?city_name=${city}&size_km=${size}`
  //     )
  //     setMessage(response.data.message)
  //   } catch (err) {
  //     setMessage(err.response?.data?.detail || "Failed to generate map")
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  return (
    <div>
      <h1 className="text-3xl font-bold">Map Generator</h1>
      <p className="mt-4 text-gray-400">
        This page will provide a form to call the <code>/api/utils/generate-map</code>
        endpoint, allowing users to create new <code>.net.xml</code> files from
        any city on OpenStreetMap.
      </p>
      <p className="mt-2 text-yellow-400">(Work in Progress)</p>

      <AboutMapsModal />
    </div>
  )
}