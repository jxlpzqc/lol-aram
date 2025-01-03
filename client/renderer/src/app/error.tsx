'use client'
import FailPage from "../components/FailPage"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <FailPage reason={"UI 发生了崩溃！原因：" + error.message} buttonTitle="重新加载 UI" onButtonClick={
      () => {
        global?.location?.replace("/");
      }
    } />
  )
}