import type {Metadata} from 'next';
import config from '../site.config.json';
import {RevoBrandHeader,RevoBrandFooter} from '@/components/RevoBrandChrome';
import '@/app/globals.css';import '@/app/revo-review.css';import '@/app/revo-pricing.css';
import {LandingConsent} from '@/components/LandingConsent';
export const metadata:Metadata={metadataBase:new URL('https://www.revoapp.ai'),robots:{index:true,follow:true},icons:{icon:'/favicon-32x32.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" className="revo-brand-document"><body className="revo-brand-body"><RevoBrandHeader mode="public" acquisitionEnabled={config.acquisitionEnabled}/>{children}<RevoBrandFooter mode="public"/><LandingConsent gaId="G-GZHGSMXCJQ" acquisitionEnabled={config.acquisitionEnabled}/></body></html>;}
