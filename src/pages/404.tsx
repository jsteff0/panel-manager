export default function Home() {
	return (
		<div
			className={`grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-[url('/bg.png')]`}
		>
			<main className="flex flex-col row-start-2 items-center sm:items-start text-white font-['Stengazeta']">
				<div className='w-[723px] flex flex-col items-center gap-[32px]'>
					<h1 className='text-[46px] leading-none'>Вы зашли слишком далеко...</h1>
					<a href="./">Вернитесь обратно</a>
				</div>
			</main >
			<footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">

			</footer>
		</div >
	);
}
