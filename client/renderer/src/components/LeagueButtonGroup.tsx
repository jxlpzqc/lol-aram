import styles from './LeagueButtonGroup.module.css'

type Props = {
  text: string,
  onConfirm?: () => void,
  onCancel?: () => void
}


function CrossSvg() {
  return (
    <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4457" ><path d="M572.3136 512l261.4272 261.4272c16.6912 16.6912 16.6912 43.7248 0 60.3136s-43.7248 16.6912-60.3136 0L512 572.3136 250.5728 833.8432c-16.6912 16.6912-43.7248 16.6912-60.3136 0-16.6912-16.6912-16.6912-43.7248 0-60.3136L451.6864 512 190.1568 250.5728c-16.6912-16.6912-16.6912-43.7248 0-60.3136 16.6912-16.6912 43.7248-16.6912 60.3136 0L512 451.6864l261.4272-261.4272c16.6912-16.6912 43.7248-16.6912 60.3136 0 16.6912 16.6912 16.6912 43.7248 0 60.3136L572.3136 512z" ></path></svg>)
}


export default function ({ text, onCancel, onConfirm }: Props) {
  return <div className='flex items-center'>
    <button onClick={onCancel} className={styles.left}><CrossSvg /></button>

    <button onClick={onConfirm} className={styles['right-container']}>
      <svg className='inline' style={{ marginLeft: 4, marginRight: -10, height: "calc(1em + 20px)" }} viewBox='0 0 30 100'>
        <path stroke='#0596aa' fill='transparent' strokeWidth={6} d="
      M 0 0
      Q 30 50, 0 100
      "/>
      </svg>

      <div className={styles.right}>{text}</div>

      <svg className='inline' style={{ marginLeft: -2, marginRight: 20, height: "calc(1em + 20px)" }} viewBox='0 0 50 100'>
        <path stroke='#0596aa' fill='transparent' strokeWidth={6} d="
      M 0 0
      L 50 50
      L 0 100
      "/>
      </svg>
    </button>
  </div>


}
