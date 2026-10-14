using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Repositories
{
    public class Repository<T> : IRepository<T> where T : class
    {
        protected readonly VeterinariodbContext _db;
        private readonly DbSet<T> _dbSet;

        public Repository(VeterinariodbContext db)
        {
            _db = db;
            _dbSet = _db.Set<T>();
        }

        public async Task<List<T>> ObtenerTodosAsync() => await _dbSet.ToListAsync();
        public async Task<List<T>> ObtenerFiltradosAsync(Expression<Func<T, bool>> predicado) => 
            await _dbSet.Where(predicado).ToListAsync();
        public IQueryable<T> Query() => _dbSet.AsQueryable();
        public async Task<T?> ObtenerPorIdAsync(int id) => await _dbSet.FindAsync(id);
        public async Task CrearAsync(T entidad) => await _dbSet.AddAsync(entidad);
        public async Task EliminarAsync(T entidad) => _dbSet.Remove(entidad);
        public async Task GuardarCambiosAsync() => await _db.SaveChangesAsync();
    }
}