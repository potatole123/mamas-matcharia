import { useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import emptyBowl from '../assets/whisking-station/empty-bowl.png'
import bowlWithMatcha1 from '../assets/whisking-station/bowl-with-matcha-1.png'
import bowlWithMatcha2 from '../assets/whisking-station/bowl-with-matcha-2.png'
import bowlWithMatcha3 from '../assets/whisking-station/bowl-with-matcha-3.png'
import bowlWithMatcha4 from '../assets/whisking-station/bowl-with-matcha-4.png'
import bowlWithMatcha5 from '../assets/whisking-station/bowl-with-matcha-5.png'
import bowlWithMatcha6 from '../assets/whisking-station/bowl-with-matcha-6.png'
import matchaPowderWithWater from '../assets/whisking-station/matcha-powder-with-water.png'
import whiskedMatcha from '../assets/whisking-station/whisked-matcha.png'
import whisk from '../assets/whisking-station/whisk.png'
import emptySpoon from '../assets/whisking-station/empty-spoon.png'
import spoonWithMatcha from '../assets/whisking-station/spoon-with-matcha.png'
import kettle from '../assets/whisking-station/kettle.png'
import kettleWater from '../assets/whisking-station/kettle-water.png'
import matchaScaleZero from '../assets/whisking-station/matcha-scale-zero.png'
import matchaTin from '../assets/whisking-station/matcha-tin.png'
import cup from '../assets/whisking-station/cup.png'
import cupWithMatcha from '../assets/whisking-station/cup-with-matcha.png'
import './StationPage.css'

function WhiskingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
  
  const [spoon1State, setSpoon1State] = useState<'empty-original' | 'matcha-over-bowl' | 'empty-return'>('empty-original')
  const [spoon2State, setSpoon2State] = useState<'empty-original' | 'matcha-over-bowl' | 'empty-return'>('empty-original')
  const [spoon3State, setSpoon3State] = useState<'empty-original' | 'matcha-over-bowl' | 'empty-return'>('empty-original')
  const [bowlMatchaLevel, setBowlMatchaLevel] = useState<'empty' | '1' | '2' | '3' | '4' | '5' | '6'>('empty')
  const [kettleState, setKettleState] = useState<'original' | 'pouring-over-bowl' | 'returning'>('original')
  const [bowlHasWater, setBowlHasWater] = useState(false)
  const [whiskState, setWhiskState] = useState<'original' | 'whisking' | 'returning'>('original')
  const [isWhisked, setIsWhisked] = useState(false)
  const [totalWeight, setTotalWeight] = useState(0)
  const [cupHasMatcha, setCupHasMatcha] = useState(false)

  const incrementMatchaLevel = () => {
    setBowlMatchaLevel(prevLevel => {
      if (prevLevel === 'empty') return '1'
      if (prevLevel === '1') return '2'
      if (prevLevel === '2') return '3'
      if (prevLevel === '3') return '4'
      if (prevLevel === '4') return '5'
      if (prevLevel === '5') return '6'
      return prevLevel
    })
    setTotalWeight(prev => prev + 1)
    // If bowl was whisked, adding more matcha makes it unwhisked again
    if (isWhisked) {
      setIsWhisked(false)
    }
  }

  const handleMatchaTin1Click = () => {
    if (spoon1State !== 'empty-original' || bowlMatchaLevel === '4') return
    
    // Move spoon with matcha over bowl
    setSpoon1State('matcha-over-bowl')
    
    // After 600ms, deposit matcha into bowl and empty the spoon
    setTimeout(() => {
      incrementMatchaLevel()
      setSpoon1State('empty-return')
    }, 600)
    
    // After another 600ms, return spoon to original position
    setTimeout(() => {
      setSpoon1State('empty-original')
    }, 1200)
  }

  const handleMatchaTin2Click = () => {
    if (spoon2State !== 'empty-original' || bowlMatchaLevel === '4') return
    
    // Move spoon with matcha over bowl
    setSpoon2State('matcha-over-bowl')
    
    // After 600ms, deposit matcha into bowl and empty the spoon
    setTimeout(() => {
      incrementMatchaLevel()
      setSpoon2State('empty-return')
    }, 600)
    
    // After another 600ms, return spoon to original position
    setTimeout(() => {
      setSpoon2State('empty-original')
    }, 1200)
  }

  const handleMatchaTin3Click = () => {
    if (spoon3State !== 'empty-original' || bowlMatchaLevel === '4') return
    
    // Move spoon with matcha over bowl
    setSpoon3State('matcha-over-bowl')
    
    // After 600ms, deposit matcha into bowl and empty the spoon
    setTimeout(() => {
      incrementMatchaLevel()
      setSpoon3State('empty-return')
    }, 600)
    
    // After another 600ms, return spoon to original position
    setTimeout(() => {
      setSpoon3State('empty-original')
    }, 1200)
  }

  const handleKettleClick = () => {
    if (kettleState !== 'original' || bowlMatchaLevel === 'empty') return
    
    // Move kettle over bowl
    setKettleState('pouring-over-bowl')
    
    // After 600ms, pour water into bowl
    setTimeout(() => {
      setBowlHasWater(true)
      setTotalWeight(prev => prev + 60)
      setKettleState('returning')
    }, 600)
    
    // After another 600ms, return kettle to original position
    setTimeout(() => {
      setKettleState('original')
    }, 1200)
  }

  const handleWhiskClick = () => {
    if (whiskState !== 'original' || !bowlHasWater) return
    
    // Move whisk over bowl and start whisking animation
    setWhiskState('whisking')
    
    // After 2000ms (whisking animation duration), show whisked matcha and return whisk
    setTimeout(() => {
      setIsWhisked(true)
      setWhiskState('returning')
    }, 2000)
    
    // After another 600ms, return whisk to original position
    setTimeout(() => {
      setWhiskState('original')
    }, 2600)
  }

  const handleBowlClick = () => {
    // Only pour if matcha is whisked
    if (!isWhisked) return
    
    // Pour whisked matcha into cup
    setCupHasMatcha(true)
    
    // Reset bowl to empty state
    setBowlMatchaLevel('empty')
    setBowlHasWater(false)
    setIsWhisked(false)
    setTotalWeight(0)
  }

  const getBowlImage = () => {
    if (isWhisked) {
      return whiskedMatcha
    }
    
    if (bowlHasWater) {
      return matchaPowderWithWater
    }
    
    switch (bowlMatchaLevel) {
      case 'empty': return emptyBowl
      case '1': return bowlWithMatcha1
      case '2': return bowlWithMatcha2
      case '3': return bowlWithMatcha3
      case '4': return bowlWithMatcha4
      case '5': return bowlWithMatcha5
      case '6': return bowlWithMatcha6
      default: return emptyBowl
    }
  }


  return (
    <main className="station-page" aria-label="Whisking station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
        />
        <img className="matcha-scale" src={matchaScaleZero} alt="" draggable="false" />
        <div className="bowl-weight-display">{totalWeight}g</div>
        <div className="regular-label">Regular</div>
        <div className="premium-label">Premium</div>
        <div className="ultra-label">Ultra</div>
        <img 
          className="whisking-empty-bowl" 
          src={getBowlImage()} 
          alt="" 
          draggable="false"
          onClick={handleBowlClick}
          style={{ cursor: isWhisked ? 'pointer' : 'default', pointerEvents: 'auto' }}
        />
        <img 
          className={
            whiskState === 'whisking' 
              ? "whisking-whisk-over-bowl whisking-animation" 
              : whiskState === 'returning'
              ? "whisking-whisk-over-bowl"
              : "whisking-whisk"
          }
          src={whisk} 
          alt="" 
          draggable="false"
          onClick={handleWhiskClick}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img 
          className={
            spoon1State === 'matcha-over-bowl' 
              ? "whisking-spoon-1-over-bowl" 
              : spoon1State === 'empty-return'
              ? "whisking-spoon-1-over-bowl"
              : "whisking-empty-spoon-1"
          } 
          src={spoon1State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon} 
          alt="" 
          draggable="false" 
        />
        <img 
          className={
            spoon2State === 'matcha-over-bowl' 
              ? "whisking-spoon-2-over-bowl" 
              : spoon2State === 'empty-return'
              ? "whisking-spoon-2-over-bowl"
              : "whisking-empty-spoon-2"
          } 
          src={spoon2State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon} 
          alt="" 
          draggable="false" 
        />
        <img 
          className={
            spoon3State === 'matcha-over-bowl' 
              ? "whisking-spoon-3-over-bowl" 
              : spoon3State === 'empty-return'
              ? "whisking-spoon-3-over-bowl"
              : "whisking-empty-spoon-3"
          } 
          src={spoon3State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon} 
          alt="" 
          draggable="false" 
        />
        <img 
          className={kettleState === 'original' ? "whisking-kettle" : "whisking-kettle-over-bowl"}
          src={kettleState === 'pouring-over-bowl' ? kettleWater : kettle} 
          alt="" 
          draggable="false"
          onClick={handleKettleClick}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img 
          className="whisking-matcha-tin-1" 
          src={matchaTin} 
          alt="" 
          draggable="false"
          onClick={handleMatchaTin1Click}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img 
          className="whisking-matcha-tin-2" 
          src={matchaTin} 
          alt="" 
          draggable="false"
          onClick={handleMatchaTin2Click}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img 
          className="whisking-matcha-tin-3" 
          src={matchaTin} 
          alt="" 
          draggable="false"
          onClick={handleMatchaTin3Click}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img className="cup" src={cupHasMatcha ? cupWithMatcha : cup} alt="" draggable="false" />
        <StationDock currentStation="whisking" />
      </section>
    </main>
  )
}

export default WhiskingStationPage
