import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
	const [data, setData] = useState([]);
	const fetchData = () => {
		fetch('api/data')
			.then(res => res.json())
			.then(data => {
				setData(data);
			})
			.catch(err => {
				console.error('Ошибка при получении данных:', err);
			});
	};

	useEffect(() => {
		fetchData();
	}, []);

	return (
		<div className="min-h-screen flex flex-col justify-between bg-black bg-fixed font-[family-name:var(--font-geist-sans)] p-6">
			<main className="p-10 sm:p-16 gap-42 flex flex-col items-center text-white font-['Stengazeta']">
				<Link className='text-xl' href={"/panel"}>Вход в панель управления</Link>
				<section className="w-full flex flex-col items-center gap-[48px] font-['Montserrat']">
					{[...data]
						.sort((a: { points: number }, b: { points: number }) => b.points - a.points)
						.map((row: { teamname: string, nicknames: string[], points: number, uuid: string }) => (
							<li
								key={row.uuid}
								className="shadow-xs text-[24px] grid grid-cols-[1fr_1fr_1fr] w-full bg-gradient-to-b from-white to-[#e2e2e2] text-black rounded-[8px] py-[5px]"
							>
								<p className="flex justify-center items-center">{row.teamname}</p>
								<p className="flex justify-center items-center">{row.nicknames[0]}, {row.nicknames[1]}</p>
								<p className="pr-6 flex justify-end items-center">{row.points}</p>
							</li>
						))}
				</section>
				
			</main >
			<footer className="h-[320px] sm:h-[150px] w-full p-8 flex flex-col sm:flex-row justify-between items-center gap-[24px] rounded-3xl font-['Montserrat'] font-medium">
			</footer>
		</div >
	);
}
