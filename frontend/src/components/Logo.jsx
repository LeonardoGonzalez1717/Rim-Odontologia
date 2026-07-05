// =============================================================================
// components/Logo.jsx — Logo de Clínica Dental Rim Challouf
// =============================================================================

const SIZES = {
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
}

const Logo = ({ size = 'md', className = '' }) => (
  <img
    src="/logo.png"
    alt="Clínica Dental Rim Challouf"
    className={`object-contain rounded-full flex-shrink-0 ${SIZES[size] ?? SIZES.md} ${className}`}
  />
)

export default Logo
