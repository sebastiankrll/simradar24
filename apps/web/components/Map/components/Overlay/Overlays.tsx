import { Feature } from 'ol'
import './Overlays.css'
import { Point } from 'ol/geom'
import { PilotProperties } from '@/types/ol'
import { StaticAirline } from '@sk/types/db'

export function PilotOverlay({ feature, airline }: { feature: Feature<Point>, airline: StaticAirline | undefined }) {
    const data = feature.getProperties() as PilotProperties

    return (
        <div className='overlay'>
            <div className="popup-content-top flight">
                <div className="popup-content-vnav"><span>ALT</span>{data.altitude_ms}</div>
                <div className="popup-content-vnav"><span>FPM</span>{data.vertical_speed}</div>
                <div className="popup-content-vnav"><span>GS</span>{data.groundspeed}</div>
                <div className="popup-content-vnav"><span>HDG</span>{Math.round(data.heading * (180 / Math.PI))}</div>
            </div>
            <div className="popup-content flight">
                <figure className="popup-content-logo" style={{ backgroundColor: airline?.font ?? 'white' }}>
                    <p style={{
                        color: airline?.bg ?? 'var(--color-green)',
                        fontSize: airline && airline.iata.length > 2 ? '.8rem' : ''
                    }}>
                        {airline?.iata}
                    </p>
                </figure>
                <div className="popup-content-main flight">
                    <div className="popup-content-header">{data.callsign}</div>
                    <div className='popup-content-box ac'>{data.aircraft}</div>
                    {/* <p>{airports ? `${airports[0]} - ${airports[1]}` : 'NaN - NaN'}</p> */}
                    <div className='popup-content-box ac-fr'>{data.frequency}</div>
                </div>
            </div>
        </div>
    )
}